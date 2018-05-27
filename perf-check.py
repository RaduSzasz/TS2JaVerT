from subprocess import run, PIPE
import re

NO_EXECS = 10
EXECUTION_STAGE_TIME_REGEX = re.compile('b\'(.*): [-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?ms')

def average_execution_time(case):
    times = { 'initialization': 0.0, 'regular-ts-compilation': 0.0, 'gather-type-info': 0.0, 'annotate-ast': 0.0, 'program-total': 0.0 }
    for _ in range(NO_EXECS):
        res = run(['node', 'dist/index.js', '--input={}'.format(case)], stdout=PIPE)
        if res.returncode != 0:
            raise Exception('Non-zero exit status running compiler')
        for line in res.stdout.splitlines():
            str_line = str(line)
            match = EXECUTION_STAGE_TIME_REGEX.match(str_line)
            times[match.group(1)] += float(match.group(2)) / float(NO_EXECS)
    print(times)

average_execution_time("./test/testPrograms/SimpleExtendingClasses.ts")
average_execution_time("./test/testPrograms/JaVerTIdGen.ts")
average_execution_time("./test/testPrograms/ReportDynamic.ts")
